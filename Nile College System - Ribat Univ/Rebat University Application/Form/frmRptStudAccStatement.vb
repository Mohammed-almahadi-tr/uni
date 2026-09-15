Imports System.Data.SqlClient

Public Class frmRptStudAccStatement

    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StdName,College,Batch,IsNull(Status,'') Status From StdFinancial Where StdID=" & CStr(Me.txtStudID.Text), cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStudName.Text = reader.Item("StdName")
                Me.txtCollege.Text = reader.Item("College")
                Me.txtBatch.Text = reader.Item("Batch")
                Me.txtStatus.Text = reader.Item("Status")
            End While
            cnn.Close()

            If Me.txtStudName.Text.Trim.Length <> 0 Then
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
        Me.txtStudID.Text = SelStudID
        FillStudDetails()
    End Sub

    Private Sub cc_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStudID.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
        End If
    End Sub

    Private Sub txtStudID_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStudID.TextChanged
        Me.txtStudName.Clear()
        Me.txtCollege.Clear()
        Me.txtBatch.Clear()
        Me.ListView1.Items.Clear()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.txtStudID.Clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.txtStudName.Text.Trim.Length = 0 Then
            Exit Sub
        Else
            Me.Cursor = Cursors.WaitCursor
            PrintStudentStatement(CInt(Me.txtStudID.Text))
            Me.Cursor = Cursors.Default
        End If
    End Sub

    Sub FillStudBills()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.ListView1.Items.Clear()
            Dim cmd As New SqlCommand("Select SNo,Letter,TuitionFees+RegFees+Stam+MadicalInsh+Clus+HiEdu+Univar+MedExamFees,TransDate " & _
                                      "From Transactions Where StudID=" & _
                                      Me.txtStudID.Text & " and TransType=N'سند قبض'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Format(Reader.Item(2), "##,###.##"))
                    .SubItems.Add(Reader.Item(3))
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
                PrintBill("سند قبض", Me.ListView1.SelectedItems(0).SubItems(1).Text, CInt(Me.ListView1.SelectedItems(0).Text))
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

    
End Class