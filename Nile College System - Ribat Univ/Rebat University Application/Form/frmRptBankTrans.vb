Imports System.Data.SqlClient

Public Class frmBankTrans

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            If Me.CombBank.SelectedIndex = -1 Then
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter(" ( select 'رصيد أول المدة' Descr,N'" & Me.CombBank.SelectedItem & _
                                          "' Acc2,0 TotalValueIn,0 TotalValueOut,sum(TotalValueOut)-sum(TotalValueIn) SNo,'" & _
                                          DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & "' " & _
                                          "TransDate from transactions where Acc1=N'حسابات النقدية' and Acc2=N'" & _
                                          Me.CombBank.SelectedItem & "' and transdate<N'" & _
                                          Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01') union all " & _
                                          "(select Descr,Acc2,TotalValueIn,TotalValueOut,TotalValueOut-TotalValueIn SNo,TransDate " & _
                                          " from transactions  where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                          " 00:00:01' and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                                          " and Acc1=N'حسابات النقدية' and Acc2=N'" & Me.CombBank.SelectedItem & "') ", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New BankTrans
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
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

    Private Sub frmBankTrans_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombBank.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc2 From Accounts Where Acc1=N'حسابات النقدية'", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombBank.Items.Add(rdr.Item(0))
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
End Class