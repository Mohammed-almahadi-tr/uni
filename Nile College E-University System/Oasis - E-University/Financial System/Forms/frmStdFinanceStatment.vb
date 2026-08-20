Imports System.Data.SqlClient

Public Class frmStdFinanceStatment

    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StudentName,Specific From Registrations Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStdName.Text = reader.Item("StudentName")
                Me.txtProgram.Text = reader.Item("Specific")
            End While
            cnn.Close()

            If Me.txtStdName.Text.Trim.Length <> 0 Then
                FillStudBills()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStdIndex.Text = SelStudID
        FillStudDetails()
    End Sub

    Private Sub txtStdIndex_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStdIndex.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
        End If
    End Sub


    Private Sub txtStudID_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStdIndex.TextChanged
        Me.txtStdName.Clear()
        Me.txtProgram.Clear()
        Me.ListView1.Items.Clear()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.txtStdIndex.Clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Exit Sub
        Else
            Me.Cursor = Cursors.WaitCursor
            PrintStudentStatement(Me.txtStdIndex.Text)
            Me.Cursor = Cursors.Default
        End If
    End Sub

    Sub FillStudBills()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.ListView1.Items.Clear()
            Dim cmd As New SqlCommand("Select SNo,TotalValueIn,TransDate " & _
                                      "From Transactionees Where StudID=N'" & _
                                      Me.txtStdIndex.Text & "' and TransType=N'Receipt Voucher'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Format(Reader.Item(1), "##,###.##"))
                    .SubItems.Add(Reader.Item(2))
                End With
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub ListView1_DoubleClick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ListView1.DoubleClick
        If Me.ListView1.SelectedItems.Count = 0 Then
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                PrintBill("Receipt Voucher", Me.ListView1.SelectedItems(0).SubItems(1).Text, CInt(Me.ListView1.SelectedItems(0).Text))
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.Message)
            End Try
        End If
    End Sub

    Public Sub PrintStudentStatement(ByVal StudID As String)
        Try
            Dim dap As New SqlDataAdapter("Select StudID,StudName,dbo.GetStdProgram(StudID) Acc1,Descr,SNo,TotalValueIn,TotalValueOut,TransDate " & _
                                          "From Transactionees Where StudID=N'" & StudID & "' and Reversed=0", cnn)
            Dim das As New DataSet

            cnn.Open()
            dap.Fill(das, "Transactionees")
            cnn.Close()

            'Dim rpt As New StudentAccStatement
            Dim rpt As New StudentAccount
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.CrystalReportViewer2.Zoom(100)
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class