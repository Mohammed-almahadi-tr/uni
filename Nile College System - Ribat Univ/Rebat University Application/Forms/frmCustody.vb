Imports System.Data.SqlClient

Public Class frmCustody

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub

    Sub FillCustodyList()
        Try
            Me.ListAcc.Items.Clear()

            Dim CustodyList As New ArrayList
            CustodyList = GetCustodyList()

            For Each AccName As String In CustodyList
                Me.ListAcc.Items.Add(AccName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtAcc.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAcc, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        If Me.txtAcc.Text.Trim.Length = 0 Then
            MsgBox("الرجاء إدخال إسم الحساب")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Accounts (Acc1,Acc2) Values (N'العهد',N'" & Me.txtAcc.Text.Trim & "')", cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillCustodyList()
                Me.txtAcc.Clear()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Sub FillListBalances()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Acc2,Sum(TotalValueOut)-Sum(TotalValueIn) From Transactions " & _
                                      "Where Acc1=N'العهد' Group By Acc2 Having Sum(TotalValueOut)-Sum(TotalValueIn)<>0", cnn)

            Dim cmd1 As New SqlCommand("Select Case When Sum(TotalValueOut)-Sum(TotalValueIn) Is Null Then 0 Else " & _
                                       "                 Sum(TotalValueOut)-Sum(TotalValueIn) End From Transactions " & _
                                       "Where Acc1=N'العهد'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListViewAcc.Items.Add(Reader.Item(0))
                    .SubItems.Add(Format(Reader.Item(1), "##,###.##"))
                End With
            End While
            Reader.Close()

            Me.txtTotal.Text = Format(CDbl(cmd1.ExecuteScalar.ToString), "##,###.##")
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmCustody_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillCustodyList()
        FillListBalances()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If Me.ListAcc.SelectedItems.Count = 0 Then
            MsgBox("الرجاء تحديد الحساب")
            Exit Sub
        Else
            Try
                If GetCustodyAccBalance(CStr(Me.ListAcc.SelectedItem)) <> 0 Then
                    MsgBox("الحساب به رصيد " & Chr(13) & "الرجاء تصفية الحساب أولا")
                    Exit Sub
                ElseIf MsgBox("تأكيد الحذف؟", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
                    Me.Cursor = Cursors.WaitCursor

                    Dim cmd As New SqlCommand("Delete From Accounts Where Acc1=N'العهد' and Acc2=N'" & _
                                              Me.ListAcc.SelectedItem & "'", cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    FillCustodyList()
                    Me.Cursor = Cursors.Default
                End If
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select Acc2 College,Sum(TotalValueOut)-Sum(TotalValueIn) TotalValueIn From Transactions " & _
                                      "Where Acc1=N'العهد' Group By Acc2 Having Sum(TotalValueOut)-Sum(TotalValueIn)<>0", cnn)

            Dim das As New DataSet

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()


            Dim rpt As New CustodyList
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(100)
            RptViewer.ShowDialog()
          
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class